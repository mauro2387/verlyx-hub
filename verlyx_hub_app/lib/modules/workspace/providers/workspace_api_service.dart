import 'package:dio/dio.dart';
import '../models/workspace_model.dart';
import '../models/page_model.dart';
import '../models/block_model.dart';

class WorkspaceApiService {
  final Dio _dio;

  WorkspaceApiService(this._dio);

  // ==========================================
  // WORKSPACES
  // ==========================================

  Future<List<WorkspaceModel>> getWorkspaces(String myCompanyId) async {
    final response = await _dio.get('/workspace', queryParameters: {
      'myCompanyId': myCompanyId,
    });
    return (response.data as List)
        .map((json) => WorkspaceModel.fromJson(json))
        .toList();
  }

  Future<WorkspaceModel> getWorkspace(String id) async {
    final response = await _dio.get('/workspace/$id');
    return WorkspaceModel.fromJson(response.data);
  }

  Future<WorkspaceModel> createWorkspace(Map<String, dynamic> data) async {
    final response = await _dio.post('/workspace', data: data);
    return WorkspaceModel.fromJson(response.data);
  }

  Future<WorkspaceModel> updateWorkspace(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/workspace/$id', data: data);
    return WorkspaceModel.fromJson(response.data);
  }

  Future<void> deleteWorkspace(String id) async {
    await _dio.delete('/workspace/$id');
  }

  // ==========================================
  // PAGES
  // ==========================================

  Future<List<PageModel>> getPages(String workspaceId, {String? parentPageId}) async {
    final response = await _dio.get('/workspace/pages', queryParameters: {
      'workspaceId': workspaceId,
      if (parentPageId != null) 'parentPageId': parentPageId,
    });
    return (response.data as List)
        .map((json) => PageModel.fromJson(json))
        .toList();
  }

  Future<PageModel> getPage(String id) async {
    final response = await _dio.get('/workspace/pages/$id');
    return PageModel.fromJson(response.data);
  }

  Future<PageModel> createPage(Map<String, dynamic> data) async {
    final response = await _dio.post('/workspace/pages', data: data);
    return PageModel.fromJson(response.data);
  }

  Future<PageModel> updatePage(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/workspace/pages/$id', data: data);
    return PageModel.fromJson(response.data);
  }

  Future<void> deletePage(String id) async {
    await _dio.delete('/workspace/pages/$id');
  }

  Future<PageModel> duplicatePage(String id, {String? newTitle}) async {
    final response = await _dio.post('/workspace/pages/$id/duplicate', data: {
      if (newTitle != null) 'newTitle': newTitle,
    });
    return PageModel.fromJson(response.data);
  }

  // ==========================================
  // BLOCKS
  // ==========================================

  Future<List<BlockModel>> getBlocks(String pageId) async {
    final response = await _dio.get('/workspace/blocks', queryParameters: {
      'pageId': pageId,
    });
    return (response.data as List)
        .map((json) => BlockModel.fromJson(json))
        .toList();
  }

  Future<BlockModel> createBlock(Map<String, dynamic> data) async {
    final response = await _dio.post('/workspace/blocks', data: data);
    return BlockModel.fromJson(response.data);
  }

  Future<BlockModel> updateBlock(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/workspace/blocks/$id', data: data);
    return BlockModel.fromJson(response.data);
  }

  Future<void> deleteBlock(String id) async {
    await _dio.delete('/workspace/blocks/$id');
  }

  Future<void> reorderBlocks(String pageId, List<Map<String, dynamic>> blockOrders) async {
    await _dio.post('/workspace/blocks/reorder', data: {
      'pageId': pageId,
      'blockOrders': blockOrders,
    });
  }
}
