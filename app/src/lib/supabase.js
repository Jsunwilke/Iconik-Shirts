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

export async function getPendingOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or('status.is.null,status.eq.pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCompletedOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .order('ss_order_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getOrderBatches() {
  // Get unique batches with their info
  const { data, error } = await supabase
    .from('orders')
    .select('ss_order_id, ss_order_date, batch_id')
    .eq('status', 'completed')
    .not('ss_order_id', 'is', null)
    .order('ss_order_date', { ascending: false })

  if (error) throw error

  // Group by ss_order_id to get unique batches
  const batches = {}
  data?.forEach(order => {
    if (order.ss_order_id && !batches[order.ss_order_id]) {
      batches[order.ss_order_id] = {
        ss_order_id: order.ss_order_id,
        ss_order_date: order.ss_order_date,
        batch_id: order.batch_id
      }
    }
  })

  return Object.values(batches)
}

export async function getOrdersByBatch(ssOrderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('ss_order_id', ssOrderId)
    .order('employee_name', { ascending: true })

  if (error) throw error
  return data
}

export async function markOrdersCompleted(orderIds, ssOrderId) {
  const batchId = `batch-${Date.now()}`
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      ss_order_id: ssOrderId,
      ss_order_date: new Date().toISOString(),
      batch_id: batchId
    })
    .in('id', orderIds)
    .select()

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

export async function getArchivedOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Archiving and restoring are UPDATEs, which Postgres RLS silently turns into
// a 0-row no-op when no UPDATE policy matches. Verify rows actually changed so
// a missing policy surfaces as an error instead of a button that does nothing.
async function setStatus(orderIds, status) {
  if (!orderIds?.length) return []

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .in('id', orderIds)
    .select()

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'No orders were updated. The database is missing an UPDATE policy on the ' +
      'orders table -- run supabase-add-update-policy.sql in the Supabase SQL Editor.'
    )
  }
  return data
}

export async function archiveOrders(orderIds) {
  return setStatus(orderIds, 'archived')
}

export async function restoreOrders(orderIds) {
  return setStatus(orderIds, 'pending')
}

export async function deleteOrders(orderIds) {
  if (!orderIds?.length) return

  const { error } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds)

  if (error) throw error
}
