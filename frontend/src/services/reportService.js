import api from './api'

export async function finalizeShiftReport(shiftId) {
  const { data } = await api.post(`/reports/shifts/${shiftId}`)
  return data
}
