import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uaerxeuiabbhyredunql.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZXJ4ZXVpYWJiaHlyZWR1bnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE0NjcsImV4cCI6MjA3NzUxNzQ2N30.U7NeCkiDXa7TGg8_g5yNWaTjsHmDv1GkLGLa8UM0-aQ'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function submitOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()

  if (error) throw error
  return data
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function deleteOrder(id) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) throw error
}
