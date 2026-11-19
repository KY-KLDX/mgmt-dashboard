/**
 * Synthetic post-close workflow per tranche: confirm successful subscribers → mint tokens →
 * allocate tokens to investor wallets → release funds to the issuer.
 * `allocatedPending` is how many confirmed investors are still waiting for their tokens.
 */
export interface AllocationSpec {
  trancheId: string;
  confirmedOn: string | null;
  mintedOn: string | null;
  allocatedOn: string | null;
  allocatedPending: number;
  releasedOn: string | null;
  blocker: string | null;
}

export const ALLOCATIONS: AllocationSpec[] = [
  { trancheId: 'TR-2611', confirmedOn: '2026-10-17', mintedOn: '2026-10-20', allocatedOn: null, allocatedPending: 3, releasedOn: null, blocker: '3 investor wallets awaiting re-verification; release scheduled 26 Oct' },
  { trancheId: 'TR-2610', confirmedOn: '2026-10-03', mintedOn: null, allocatedOn: null, allocatedPending: 0, releasedOn: null, blocker: 'Minting on hold: issuer CP board resolution outstanding (signing 24 Oct)' },
  { trancheId: 'TR-2609', confirmedOn: '2026-09-12', mintedOn: '2026-09-14', allocatedOn: '2026-09-15', allocatedPending: 0, releasedOn: '2026-09-16', blocker: null },
  { trancheId: 'TR-2608', confirmedOn: '2026-08-15', mintedOn: '2026-08-17', allocatedOn: '2026-08-18', allocatedPending: 0, releasedOn: '2026-08-19', blocker: null },
];
