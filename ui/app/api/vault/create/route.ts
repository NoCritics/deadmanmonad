import { NextRequest, NextResponse } from 'next/server';
import { createVault } from '@vault/index';
import { PeriodUnit } from '@vault/utils/time-helpers';
import type { Hex } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.ownerAddress || !body.ownerPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse period unit
    let periodUnit: PeriodUnit = PeriodUnit.DAYS;
    switch (body.periodUnit?.toLowerCase()) {
      case 'minutes':
        periodUnit = PeriodUnit.MINUTES;
        break;
      case 'hours':
        periodUnit = PeriodUnit.HOURS;
        break;
      case 'days':
        periodUnit = PeriodUnit.DAYS;
        break;
      case 'weeks':
        periodUnit = PeriodUnit.WEEKS;
        break;
      case 'months':
        periodUnit = PeriodUnit.MONTHS;
        break;
    }

    console.log('API: Creating vault with params:', {
      ownerAddress: body.ownerAddress,
      checkInPeriod: body.checkInPeriod,
      periodUnit,
      initialFunding: body.initialFunding,
    });

    // Call vault creation
    const result = await createVault({
      ownerAddress: body.ownerAddress,
      checkInPeriod: body.checkInPeriod || 30,
      checkInPeriodUnit: periodUnit,
      initialFunding: BigInt(body.initialFunding || '0'),
      ownerPrivateKey: body.ownerPrivateKey as Hex,
    });

    console.log('API: Vault created successfully:', result.vault.address);

    // Return serializable response (convert BigInt to string)
    return NextResponse.json({
      success: true,
      vaultAddress: result.vault.address,
      config: {
        ...result.config,
        totalValue: result.config.totalValue.toString(),
      },
    });
  } catch (error: any) {
    console.error('API: Error creating vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create vault',
      },
      { status: 500 }
    );
  }
}
