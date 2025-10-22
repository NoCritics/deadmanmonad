import { NextRequest, NextResponse } from 'next/server';
import { simpleCheckIn, loadVault } from '@vault/index';
import type { Address } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vaultAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing vault address' },
        { status: 400 }
      );
    }

    console.log('API: Owner checking in to vault:', body.vaultAddress);

    // Validate private key
    if (!body.ownerPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Missing owner private key' },
        { status: 400 }
      );
    }

    // Load the vault with owner's private key
    const vault = await loadVault(body.vaultAddress as Address, body.ownerPrivateKey);

    // Perform check-in
    const checkInRecord = await simpleCheckIn(vault, body.ownerPrivateKey, body.newCheckInPeriodDays);

    console.log('API: Check-in successful');

    // Return serializable response
    return NextResponse.json({
      success: true,
      checkInRecord: {
        ...checkInRecord,
        gasUsed: checkInRecord.gasUsed.toString(),
      },
    });
  } catch (error: any) {
    console.error('API: Error checking in:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check in',
      },
      { status: 500 }
    );
  }
}
