import 'package:dio/dio.dart';
import '../models/organization_model.dart';

class OrganizationsRepository {
  final Dio _dio;

  OrganizationsRepository(this._dio);

  Future<List<OrganizationModel>> getOrganizations({
    required String myCompanyId,
    String? clientId,
  }) async {
    try {
      final queryParams = {
        'myCompanyId': myCompanyId,
        if (clientId != null) 'clientId': clientId,
      };
      
      final response = await _dio.get(
        '/organizations',
        queryParameters: queryParams,
      );
      
      final List<dynamic> data = response.data as List;
      return data.map((json) => OrganizationModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar organizaciones: $e');
    }
  }

  Future<List<OrganizationModel>> getHierarchy(String clientId) async {
    try {
      final response = await _dio.get('/organizations/hierarchy/$clientId');
      final List<dynamic> data = response.data as List;
      return data.map((json) => OrganizationModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar jerarquía: $e');
    }
  }

  Future<OrganizationModel> getOrganization(String id) async {
    try {
      final response = await _dio.get('/organizations/$id');
      return OrganizationModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al cargar organización: $e');
    }
  }

  Future<OrganizationModel> createOrganization(
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await _dio.post('/organizations', data: data);
      return OrganizationModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al crear organización: $e');
    }
  }

  Future<OrganizationModel> updateOrganization(
    String id,
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await _dio.put('/organizations/$id', data: data);
      return OrganizationModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al actualizar organización: $e');
    }
  }

  Future<void> deleteOrganization(String id) async {
    try {
      await _dio.delete('/organizations/$id');
    } catch (e) {
      throw Exception('Error al eliminar organización: $e');
    }
  }
}
