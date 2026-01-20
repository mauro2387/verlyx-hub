import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_provider.dart';
import '../data/repositories/organizations_repository.dart';
import '../data/models/organization_model.dart';

final organizationsRepositoryProvider = Provider<OrganizationsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return OrganizationsRepository(dio);
});

final organizationsListProvider = FutureProvider.family<List<OrganizationModel>, OrganizationsParams>(
  (ref, params) async {
    final repository = ref.watch(organizationsRepositoryProvider);
    return repository.getOrganizations(
      myCompanyId: params.myCompanyId,
      clientId: params.clientId,
    );
  },
);

final organizationHierarchyProvider = FutureProvider.family<List<OrganizationModel>, String>(
  (ref, clientId) async {
    final repository = ref.watch(organizationsRepositoryProvider);
    return repository.getHierarchy(clientId);
  },
);

final organizationDetailProvider = FutureProvider.family<OrganizationModel, String>(
  (ref, id) async {
    final repository = ref.watch(organizationsRepositoryProvider);
    return repository.getOrganization(id);
  },
);

class OrganizationsParams {
  final String myCompanyId;
  final String? clientId;

  OrganizationsParams({
    required this.myCompanyId,
    this.clientId,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is OrganizationsParams &&
        other.myCompanyId == myCompanyId &&
        other.clientId == clientId;
  }

  @override
  int get hashCode => myCompanyId.hashCode ^ clientId.hashCode;
}
