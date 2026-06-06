import api from './api'

export async function createEventMultipart({ shiftId, machineId, description, eventTime, eventEndTime }) {
  const formData = new FormData()
  formData.append('shift_id', shiftId)
  formData.append('machine_id', machineId)
  formData.append('description', description)
  formData.append('event_time', eventTime)
  if (eventEndTime) formData.append('event_end_time', eventEndTime)

  const { data } = await api.post('/events/multipart', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}
