import { NextRequest, NextResponse } from 'next/server';
import { setupBeneficiaries, loadVault } from '@vault/index';
import type { Hex, Address } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vaultAddress || !body.ownerPrivateKey || !body.beneficiaries || !body.deadline) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('API: Setting up beneficiaries for vault:', body.vaultAddress);
    console.log('API: Beneficiary count:', body.beneficiaries.length);

    // Load the vault with owner's private key
    const vault = await loadVault(body.vaultAddress as Address, body.ownerPrivateKey as Hex);

    // Convert beneficiaries to proper format with allocations
    const beneficiariesWithAllocations = body.beneficiaries.map((b: any) => ({
      address: b.address as Address,
      name: b.name,
      allocation: BigInt(b.allocation),
    }));

    // Setup beneficiaries
    const result = await setupBeneficiaries({
      vault,
      beneficiaries: beneficiariesWithAllocations,
      deadline: body.deadline,
    });

    console.log('API: Beneficiaries setup successfully');

    // Return serializable response
    return NextResponse.json({
      success: true,
      beneficiaries: result.map((b) => ({
        ...b,
        allocation: b.allocation.toString(),
        delegation: undefined, // Don't send full delegation object
        delegationHash: b.delegationHash,
      })),
    });
  } catch (error: any) {
    console.error('API: Error setting up beneficiaries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to setup beneficiaries',
      },
      { status: 500 }
    );
  }
}
