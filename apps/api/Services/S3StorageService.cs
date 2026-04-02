using Amazon.S3;
using Amazon.S3.Model;

namespace FieldMind.Api.Services;

public class S3StorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly IConfiguration _configuration;
    private readonly string _bucketName;
    private readonly int _presignExpiry;

    public S3StorageService(IConfiguration configuration)
    {
        _configuration = configuration;
        _bucketName = configuration["AWS:S3Bucket"] ?? "fieldmind-photos-dev";
        _presignExpiry = int.Parse(configuration["AWS:PresignExpiry"] ?? "300");

        var awsRegion = configuration["AWS:Region"] ?? "us-east-1";
        var awsAccessKey = configuration["AWS:AccessKeyId"];
        var awsSecretKey = configuration["AWS:SecretAccessKey"];

        if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey))
        {
            _s3Client = new AmazonS3Client(
                awsAccessKey,
                awsSecretKey,
                Amazon.RegionEndpoint.GetBySystemName(awsRegion)
            );
        }
        else
        {
            // Use default AWS credentials (IAM role, environment variables, etc.)
            _s3Client = new AmazonS3Client(Amazon.RegionEndpoint.GetBySystemName(awsRegion));
        }
    }

    public string GenerateKey(string teamId, string buildingId, string photoId, string filename)
    {
        return $"{teamId}/{buildingId}/{photoId}/{filename}";
    }

    public async Task<(string Url, int ExpiresIn)> GeneratePresignedPutUrl(string key, string contentType)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddSeconds(_presignExpiry),
            ContentType = contentType
        };

        var url = await Task.Run(() => _s3Client.GetPreSignedURL(request));

        return (url, _presignExpiry);
    }

    public async Task<string> GeneratePresignedGetUrl(string key, int expiresIn = 3600)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddSeconds(expiresIn)
        };

        return await Task.Run(() => _s3Client.GetPreSignedURL(request));
    }

    public async Task DeleteObject(string key)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
        };
        await _s3Client.DeleteObjectAsync(request);
    }

    public string GetPublicUrl(string key)
    {
        return $"https://{_bucketName}.s3.amazonaws.com/{key}";
    }
}
