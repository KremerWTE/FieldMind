using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs;
using BCrypt.Net;

namespace FieldMind.Api.Services;

public class AuthService
{
    private readonly FieldMindDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(FieldMindDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponse?> Register(RegisterRequest request)
    {
        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return null; // Email already in use
        }

        // Create or get team
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Slug == request.TeamSlug);
        if (team == null)
        {
            team = new Team
            {
                Name = request.TeamName ?? request.TeamSlug,
                Slug = request.TeamSlug
            };
            _context.Teams.Add(team);
            await _context.SaveChangesAsync();
        }

        // Create user
        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = Enum.Parse<UserRole>(request.Role ?? "FieldTech"),
            TeamId = team.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Reload with team
        user = await _context.Users
            .Include(u => u.Team)
            .FirstAsync(u => u.Id == user.Id);

        // Generate tokens
        var (accessToken, refreshToken) = await GenerateTokens(user);

        return new AuthResponse
        {
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString(),
                TeamId = user.TeamId,
                Team = new TeamDto { Id = team.Id, Name = team.Name, Slug = team.Slug }
            },
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };
    }

    public async Task<AuthResponse?> Login(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Team)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return null; // Invalid credentials
        }

        var (accessToken, refreshToken) = await GenerateTokens(user);

        return new AuthResponse
        {
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString(),
                TeamId = user.TeamId,
                Team = new TeamDto { Id = user.Team.Id, Name = user.Team.Name, Slug = user.Team.Slug }
            },
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };
    }

    private async Task<(string AccessToken, string RefreshToken)> GenerateTokens(User user)
    {
        var jwtSecret = _configuration["JWT:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
        var key = Encoding.ASCII.GetBytes(jwtSecret);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("teamId", user.TeamId)
            }),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var accessToken = tokenHandler.WriteToken(token);

        // Create refresh token
        var refreshToken = new RefreshToken
        {
            Token = Guid.NewGuid().ToString(),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return (accessToken, refreshToken.Token);
    }

    public async Task<AuthResponse?> RefreshToken(string refreshToken)
    {
        var tokenRecord = await _context.RefreshTokens
            .Include(rt => rt.User)
            .ThenInclude(u => u.Team)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (tokenRecord == null || tokenRecord.ExpiresAt < DateTime.UtcNow)
        {
            return null; // Invalid or expired
        }

        var user = tokenRecord.User;
        var (newAccessToken, newRefreshToken) = await GenerateTokens(user);

        // Remove old refresh token
        _context.RefreshTokens.Remove(tokenRecord);
        await _context.SaveChangesAsync();

        return new AuthResponse
        {
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString(),
                TeamId = user.TeamId,
                Team = new TeamDto { Id = user.Team.Id, Name = user.Team.Name, Slug = user.Team.Slug }
            },
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken
        };
    }

    public async Task Logout(string refreshToken)
    {
        var token = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        if (token != null)
        {
            _context.RefreshTokens.Remove(token);
            await _context.SaveChangesAsync();
        }
    }
}
