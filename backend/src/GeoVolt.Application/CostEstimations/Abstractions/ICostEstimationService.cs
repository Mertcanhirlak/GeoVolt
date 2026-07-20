using GeoVolt.Application.CostEstimations.Dtos;

namespace GeoVolt.Application.CostEstimations.Abstractions;
//maliyet tahmini hesaplamalarını gerçekleştiren servis arayüzü
public interface ICostEstimationService
{
	CostEstimationResultDto Calculate(
		CostEstimationInputDto input);
}