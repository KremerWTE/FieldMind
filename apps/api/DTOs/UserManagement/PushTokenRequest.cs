namespace FieldMind.Api.DTOs.UserManagement;

public class PushTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string? Platform { get; set; } // ios | android
}
