import 'package:dio/dio.dart';
import '../models/client_model.dart';

class ClientsRepository {
  final Dio _dio;

  ClientsRepository(this._dio);

  Future<List<ClientModel>> getClients() async {
    try {
      final response = await _dio.get('/companies');
      final List<dynamic> data = response.data as List;
      return data.map((json) => ClientModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar clientes: $e');
    }
  }

  Future<ClientModel> getClient(String id) async {
    try {
      final response = await _dio.get('/companies/$id');
      return ClientModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al cargar cliente: $e');
    }
  }

  Future<ClientModel> createClient(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/companies', data: data);
      return ClientModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al crear cliente: $e');
    }
  }

  Future<ClientModel> updateClient(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/companies/$id', data: data);
      return ClientModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al actualizar cliente: $e');
    }
  }

  Future<void> deleteClient(String id) async {
    try {
      await _dio.delete('/companies/$id');
    } catch (e) {
      throw Exception('Error al eliminar cliente: $e');
    }
  }
}
