import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { gym_id } = await request.json()
    if (!gym_id) {
      return NextResponse.json({ error: 'gym_id required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Find member
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('gym_id', gym_id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this gym' }, { status: 403 })
    }

    const { error } = await supabase.from('attendance').insert({
      member_id: member.id,
      gym_id,
    })

    if (error) {
      if (error.message.includes('duplicate')) {
        return NextResponse.json({ message: 'Already checked in today' })
      }
      throw error
    }

    return NextResponse.json({ message: 'Checked in successfully!' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Check-in failed' }, { status: 500 })
  }
}
