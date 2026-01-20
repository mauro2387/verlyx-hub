import 'package:dio/dio.dart';
import '../models/deal_model.dart';

class DealsRepository {
  final Dio _dio;

  DealsRepository(this._dio);

  Future<List<DealModel>> getDeals({
    required String myCompanyId,
    String? stage,
    String? clientId,
  }) async {
    try {
      final queryParams = {
        'myCompanyId': myCompanyId,
        if (stage != null) 'stage': stage,
        if (clientId != null) 'clientId': clientId,
      };

      final response = await _dio.get(
        '/deals',
        queryParameters: queryParams,
      );

      final List<dynamic> data = response.data as List;
      return data.map((json) => DealModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar deals: $e');
    }
  }

  Future<List<PipelineStats>> getPipelineStats(String myCompanyId) async {
    try {
      final response = await _dio.get('/deals/pipeline-stats/$myCompanyId');
      final List<dynamic> data = response.data as List;
      return data.map((json) => PipelineStats.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar estadísticas: $e');
    }
  }

  Future<DealModel> getDeal(String id) async {
    try {
      final response = await _dio.get('/deals/$id');
      return DealModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al cargar deal: $e');
    }
  }

  Future<DealModel> createDeal(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/deals', data: data);
      return DealModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al crear deal: $e');
    }
  }

  Future<DealModel> updateDeal(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/deals/$id', data: data);
      return DealModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al actualizar deal: $e');
    }
  }

  Future<DealModel> moveToStage(
    String id,
    String newStage, {
    String? reason,
  }) async {
    try {
      final response = await _dio.post(
        '/deals/$id/move-stage',
        data: {
          'newStage': newStage,
          if (reason != null) 'reason': reason,
        },
      );
      return DealModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al mover deal: $e');
    }
  }

  Future<String> createProjectFromDeal(
    String dealId, {
    String? projectName,
    String? projectDescription,
  }) async {
    try {
      final response = await _dio.post(
        '/deals/$dealId/create-project',
        data: {
          if (projectName != null) 'projectName': projectName,
          if (projectDescription != null)
            'projectDescription': projectDescription,
        },
      );
      return response.data['projectId'];
    } catch (e) {
      throw Exception('Error al crear proyecto: $e');
    }
  }

  Future<void> deleteDeal(String id) async {
    try {
      await _dio.delete('/deals/$id');
    } catch (e) {
      throw Exception('Error al eliminar deal: $e');
    }
  }
}
