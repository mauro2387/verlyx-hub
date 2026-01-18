import 'package:dio/dio.dart';
import '../models/my_company_model.dart';

class MyCompaniesRepository {
  final Dio _dio;

  MyCompaniesRepository(this._dio);

  Future<List<MyCompanyModel>> getMyCompanies() async {
    try {
      final response = await _dio.get('/my-companies');
      final List<dynamic> data = response.data as List;
      return data.map((json) => MyCompanyModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar mis empresas: $e');
    }
  }

  Future<MyCompanyModel> getMyCompany(String id) async {
    try {
      final response = await _dio.get('/my-companies/$id');
      return MyCompanyModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al cargar mi empresa: $e');
    }
  }

  Future<MyCompanyModel> createMyCompany(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/my-companies', data: data);
      return MyCompanyModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al crear mi empresa: $e');
    }
  }

  Future<MyCompanyModel> updateMyCompany(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/my-companies/$id', data: data);
      return MyCompanyModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al actualizar mi empresa: $e');
    }
  }

  Future<void> deleteMyCompany(String id) async {
    try {
      await _dio.delete('/my-companies/$id');
    } catch (e) {
      throw Exception('Error al eliminar mi empresa: $e');
    }
  }
}
