using System.ComponentModel.DataAnnotations;

public class ChangePinRequest
{
    [Required]
    public string Pin { get; set; } = string.Empty;
}
