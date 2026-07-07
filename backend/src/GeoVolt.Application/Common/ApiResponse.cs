namespace GeoVolt.Application.Common;

public sealed record ApiResponse<T>(bool Success, T? Data, string Message)
{
    public static ApiResponse<T> Ok(T data, string message = "İşlem başarılı.")
    {
        return new ApiResponse<T>(true, data, message);
    }

    public static ApiResponse<T> Fail(string message)
    {
        return new ApiResponse<T>(false, default, message);
    }
}
