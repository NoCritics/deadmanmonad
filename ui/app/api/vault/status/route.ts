import { NextRequest, NextResponse } from 'next/server';
import { getVaultStatus } from '@vault/index';
import type { Address } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultAddress = searchParams.get('address');

    if (!vaultAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing vault address' },
        { status: 400 }
      );
    }

    console.log('API: Getting vault status:', vaultAddress);

    // Get vault status
    const status = await getVaultStatus(vaultAddress as Address);

    console.log('API: Status retrieved successfully');

    // Return serializable response (convert BigInt to string)
    return NextResponse.json({
      success: true,
      status: {
        config: {
          ...status.config,
          totalValue: status.config.totalValue.toString(),
        },
        beneficiaries: status.beneficiaries.map((b) => ({
          ...b,
          allocation: b.allocation.toString(),
          delegation: undefined, // Don't send full delegation
          delegationHash: b.delegationHash,
        })),
        checkIns: status.checkIns.map((c) => ({
          ...c,
          gasUsed: c.gasUsed.toString(),
        })),
        status: status.status,
        timeRemaining: status.timeRemaining,
        canCheckIn: status.canCheckIn,
      },
    });
  } catch (error: any) {
    console.error('API: Error getting vault status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get vault status',
      },
      { status: 500 }
    );
  }
}
