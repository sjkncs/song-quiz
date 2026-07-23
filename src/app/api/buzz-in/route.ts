import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// POST /api/buzz-in
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { roundId, playerId } = await req.json();

    if (!roundId || !playerId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase
      .from('game_rounds')
      .update({ buzzed_in_player_id: playerId, buzzed_in_at: new Date().toISOString() })
      .eq('id', roundId)
      .is('buzzed_in_player_id', null)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: '已经有人抢答了' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('buzz-in error:', err);
    const msg = err instanceof Error ? err.message : '抢答时发生未知错误';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
