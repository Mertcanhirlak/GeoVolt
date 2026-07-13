using GeoVolt.Application.Common;
using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.DataImports.Models;
using GeoVolt.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/data-imports")]
public sealed class AdminDataImportsController : ControllerBase
{
    private readonly IDataImportValidationService _validationService;
    private readonly IDataImportStagingService _stagingService;

    public AdminDataImportsController(
        IDataImportValidationService validationService,
        IDataImportStagingService stagingService)
    {
        _validationService = validationService;
        _stagingService = stagingService;
    }

    [HttpPost("validate")]
    [Authorize(Policy = PermissionNames.DataImportValidate)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(DataImportLimits.MaximumMultipartRequestSizeBytes)]
    [ProducesResponseType(typeof(ApiResponse<DatasetValidationResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DatasetValidationResult>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<DatasetValidationResult>>> Validate(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(ApiResponse<DatasetValidationResult>.Fail("Doğrulanacak dosya boş."));
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".geojson", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<DatasetValidationResult>.Fail("Yalnızca .geojson dosyaları doğrulanabilir."));
        }

        await using var stream = file.OpenReadStream();
        var result = await _validationService.ValidateGeoJsonAsync(stream, file.FileName, cancellationToken);
        var response = result.IsValid
            ? ApiResponse<DatasetValidationResult>.Ok(result, "GeoJSON dosyası doğrulamadan geçti.")
            : new ApiResponse<DatasetValidationResult>(false, result, "GeoJSON dosyasında doğrulama hataları bulundu.");

        return result.IsValid ? Ok(response) : BadRequest(response);
    }

    [HttpPost("stage")]
    [Authorize(Policy = PermissionNames.DataImportExecute)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(DataImportLimits.MaximumMultipartRequestSizeBytes)]
    [ProducesResponseType(typeof(ApiResponse<DatasetStagingResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DatasetStagingResult>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<DatasetStagingResult>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<DatasetStagingResult>>> Stage(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(ApiResponse<DatasetStagingResult>.Fail("Aktarılacak dosya boş."));
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".geojson", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<DatasetStagingResult>.Fail("Yalnızca .geojson dosyaları aktarılabilir."));
        }

        await using var stream = file.OpenReadStream();
        var result = await _stagingService.StageGeoJsonAsync(stream, file.FileName, cancellationToken);
        var response = new ApiResponse<DatasetStagingResult>(result.Success, result, result.Message);

        if (result.IsDuplicate)
        {
            return Conflict(response);
        }

        return result.Success ? Ok(response) : BadRequest(response);
    }
}
