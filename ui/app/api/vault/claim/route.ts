import { NextRequest, NextResponse } from 'next/server';
import { simpleClaim } from '@vault/index';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vaultAddress || !body.beneficiaryPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('API: Beneficiary claiming from vault:', body.vaultAddress);

    // Create beneficiary account
    const beneficiaryAccount = privateKeyToAccount(body.beneficiaryPrivateKey as Hex);

    // Perform claim
    const result = await simpleClaim(
      body.vaultAddress as Address,
      beneficiaryAccount
    );

    console.log('API: Claim successful, TX:', result.txHash);

    // Return serializable response
    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      amount: result.amount.toString(),
      gasUsed: result.gasUsed.toString(),
    });
  } catch (error: any) {
    console.error('API: Error claiming:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to claim',
      },
      { status: 500 }
    );
  }
}
