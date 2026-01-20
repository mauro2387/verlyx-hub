import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_provider.dart';
import '../data/repositories/deals_repository.dart';
import '../data/models/deal_model.dart';

final dealsRepositoryProvider = Provider<DealsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return DealsRepository(dio);
});

final dealsListProvider = FutureProvider.family<List<DealModel>, DealsParams>(
  (ref, params) async {
    final repository = ref.watch(dealsRepositoryProvider);
    return repository.getDeals(
      myCompanyId: params.myCompanyId,
      stage: params.stage,
      clientId: params.clientId,
    );
  },
);

final pipelineStatsProvider = FutureProvider.family<List<PipelineStats>, String>(
  (ref, myCompanyId) async {
    final repository = ref.watch(dealsRepositoryProvider);
    return repository.getPipelineStats(myCompanyId);
  },
);

final dealDetailProvider = FutureProvider.family<DealModel, String>(
  (ref, id) async {
    final repository = ref.watch(dealsRepositoryProvider);
    return repository.getDeal(id);
  },
);

class DealsParams {
  final String myCompanyId;
  final String? stage;
  final String? clientId;

  DealsParams({
    required this.myCompanyId,
    this.stage,
    this.clientId,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is DealsParams &&
        other.myCompanyId == myCompanyId &&
        other.stage == stage &&
        other.clientId == clientId;
  }

  @override
  int get hashCode => myCompanyId.hashCode ^ stage.hashCode ^ clientId.hashCode;
}
