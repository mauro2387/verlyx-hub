import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/dio_provider.dart';
import '../models/workspace_model.dart';
import '../models/page_model.dart';
import '../models/block_model.dart';
import 'workspace_api_service.dart';

// API Service Provider
final workspaceApiServiceProvider = Provider<WorkspaceApiService>((ref) {
  final dio = ref.watch(dioProvider);
  return WorkspaceApiService(dio);
});

// ==========================================
// WORKSPACES STATE
// ==========================================

final workspacesProvider = StateNotifierProvider<WorkspacesNotifier, AsyncValue<List<WorkspaceModel>>>((ref) {
  return WorkspacesNotifier(ref.watch(workspaceApiServiceProvider));
});

class WorkspacesNotifier extends StateNotifier<AsyncValue<List<WorkspaceModel>>> {
  final WorkspaceApiService _apiService;

  WorkspacesNotifier(this._apiService) : super(const AsyncValue.loading());

  Future<void> loadWorkspaces(String myCompanyId) async {
    state = const AsyncValue.loading();
    try {
      final workspaces = await _apiService.getWorkspaces(myCompanyId);
      state = AsyncValue.data(workspaces);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> createWorkspace(Map<String, dynamic> data) async {
    try {
      final newWorkspace = await _apiService.createWorkspace(data);
      state.whenData((workspaces) {
        state = AsyncValue.data([...workspaces, newWorkspace]);
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> updateWorkspace(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _apiService.updateWorkspace(id, data);
      state.whenData((workspaces) {
        final index = workspaces.indexWhere((w) => w.id == id);
        if (index != -1) {
          final newList = [...workspaces];
          newList[index] = updated;
          state = AsyncValue.data(newList);
        }
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> deleteWorkspace(String id) async {
    try {
      await _apiService.deleteWorkspace(id);
      state.whenData((workspaces) {
        state = AsyncValue.data(workspaces.where((w) => w.id != id).toList());
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
}

// ==========================================
// PAGES STATE
// ==========================================

final pagesProvider = StateNotifierProvider.family<PagesNotifier, AsyncValue<List<PageModel>>, String>((ref, workspaceId) {
  return PagesNotifier(ref.watch(workspaceApiServiceProvider), workspaceId);
});

class PagesNotifier extends StateNotifier<AsyncValue<List<PageModel>>> {
  final WorkspaceApiService _apiService;
  final String workspaceId;

  PagesNotifier(this._apiService, this.workspaceId) : super(const AsyncValue.loading());

  Future<void> loadPages({String? parentPageId}) async {
    state = const AsyncValue.loading();
    try {
      final pages = await _apiService.getPages(workspaceId, parentPageId: parentPageId);
      state = AsyncValue.data(pages);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> createPage(Map<String, dynamic> data) async {
    try {
      final newPage = await _apiService.createPage(data);
      state.whenData((pages) {
        state = AsyncValue.data([...pages, newPage]);
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> updatePage(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _apiService.updatePage(id, data);
      state.whenData((pages) {
        final index = pages.indexWhere((p) => p.id == id);
        if (index != -1) {
          final newList = [...pages];
          newList[index] = updated;
          state = AsyncValue.data(newList);
        }
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> deletePage(String id) async {
    try {
      await _apiService.deletePage(id);
      state.whenData((pages) {
        state = AsyncValue.data(pages.where((p) => p.id != id).toList());
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> duplicatePage(String id, {String? newTitle}) async {
    try {
      final duplicated = await _apiService.duplicatePage(id, newTitle: newTitle);
      state.whenData((pages) {
        state = AsyncValue.data([...pages, duplicated]);
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
}

// ==========================================
// CURRENT PAGE DETAIL
// ==========================================

final currentPageProvider = StateNotifierProvider.family<CurrentPageNotifier, AsyncValue<PageModel?>, String>((ref, pageId) {
  return CurrentPageNotifier(ref.watch(workspaceApiServiceProvider), pageId);
});

class CurrentPageNotifier extends StateNotifier<AsyncValue<PageModel?>> {
  final WorkspaceApiService _apiService;
  final String pageId;

  CurrentPageNotifier(this._apiService, this.pageId) : super(const AsyncValue.loading()) {
    loadPage();
  }

  Future<void> loadPage() async {
    state = const AsyncValue.loading();
    try {
      final page = await _apiService.getPage(pageId);
      state = AsyncValue.data(page);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> updatePageLocally(PageModel page) async {
    state = AsyncValue.data(page);
  }
}

// ==========================================
// BLOCKS STATE
// ==========================================

final blocksProvider = StateNotifierProvider.family<BlocksNotifier, AsyncValue<List<BlockModel>>, String>((ref, pageId) {
  return BlocksNotifier(ref.watch(workspaceApiServiceProvider), pageId);
});

class BlocksNotifier extends StateNotifier<AsyncValue<List<BlockModel>>> {
  final WorkspaceApiService _apiService;
  final String pageId;

  BlocksNotifier(this._apiService, this.pageId) : super(const AsyncValue.loading());

  Future<void> loadBlocks() async {
    state = const AsyncValue.loading();
    try {
      final blocks = await _apiService.getBlocks(pageId);
      state = AsyncValue.data(blocks);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> createBlock(Map<String, dynamic> data) async {
    try {
      final newBlock = await _apiService.createBlock(data);
      state.whenData((blocks) {
        state = AsyncValue.data([...blocks, newBlock]);
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> updateBlock(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _apiService.updateBlock(id, data);
      state.whenData((blocks) {
        final index = blocks.indexWhere((b) => b.id == id);
        if (index != -1) {
          final newList = [...blocks];
          newList[index] = updated;
          state = AsyncValue.data(newList);
        }
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> deleteBlock(String id) async {
    try {
      await _apiService.deleteBlock(id);
      state.whenData((blocks) {
        state = AsyncValue.data(blocks.where((b) => b.id != id).toList());
      });
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> reorderBlocks(List<Map<String, dynamic>> blockOrders) async {
    try {
      await _apiService.reorderBlocks(pageId, blockOrders);
      await loadBlocks(); // Reload after reorder
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
}
