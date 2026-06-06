import api from './api'

export async function startShift(payload) {
  const { data } = await api.post('/shifts', payload)
  return data
}

export async function setupShift(shiftId, formData) {
  const { data } = await api.post(`/shifts/${shiftId}/setup`, formData)
  return data
}

export async function getShiftMachineSetups(shiftId) {
  const { data } = await api.get(`/shifts/${shiftId}/setups`)
  return Array.isArray(data) ? data : []
}

export async function closeShiftMachineOrder(shiftId, machineId) {
  const { data } = await api.post(`/shifts/${shiftId}/setups/${machineId}/close`)
  return data
}

export async function deleteShiftMachineSetup(shiftId, setupId) {
  await api.delete(`/shifts/${shiftId}/setups/${setupId}`)
}
