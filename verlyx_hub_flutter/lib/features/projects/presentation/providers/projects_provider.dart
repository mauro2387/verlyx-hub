import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/project_model.dart';
import '../../data/repositories/projects_repository.dart';
import '../../../../core/network/dio_provider.dart';

// Repository Provider
final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ProjectsRepository(dio);
});

// Projects List Provider
final projectsProvider = StateNotifierProvider<ProjectsNotifier, AsyncValue<List<ProjectModel>>>((ref) {
  return ProjectsNotifier(ref.read(projectsRepositoryProvider));
});

class ProjectsNotifier extends StateNotifier<AsyncValue<List<ProjectModel>>> {
  final ProjectsRepository _repository;
  String? _currentCompanyId;
  String? _currentStatus;
  String? _currentPriority;
  String? _currentSearch;

  ProjectsNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadProjects();
  }

  Future<void> loadProjects({
    String? companyId,
    String? status,
    String? priority,
    String? search,
  }) async {
    _currentCompanyId = companyId ?? _currentCompanyId;
    _currentStatus = status ?? _currentStatus;
    _currentPriority = priority ?? _currentPriority;
    _currentSearch = search ?? _currentSearch;

    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.getProjects(
      companyId: _currentCompanyId,
      status: _currentStatus,
      priority: _currentPriority,
      search: _currentSearch,
      includeArchived: false,
    ));
  }

  Future<void> refresh() async {
    await loadProjects();
  }

  Future<void> clearFilters() async {
    _currentCompanyId = null;
    _currentStatus = null;
    _currentPriority = null;
    _currentSearch = null;
    await loadProjects();
  }

  String? get currentCompanyId => _currentCompanyId;
  String? get currentStatus => _currentStatus;
  String? get currentPriority => _currentPriority;
  String? get currentSearch => _currentSearch;
}

// Single Project Provider
final projectProvider = FutureProvider.family<ProjectModel, String>((ref, id) async {
  final repository = ref.read(projectsRepositoryProvider);
  return repository.getProject(id);
});

// Stats Provider
final projectsStatsProvider = FutureProvider.family<Map<String, dynamic>, String?>((ref, companyId) async {
  final repository = ref.read(projectsRepositoryProvider);
  return repository.getStats(companyId: companyId);
});
