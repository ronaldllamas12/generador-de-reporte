import { describe, expect, it } from 'vitest'
import { getMachineStatusKey } from './machineStatus'

describe('getMachineStatusKey', () => {
  it('returns en_produccion when current_status is en_produccion', () => {
    expect(getMachineStatusKey({ current_status: 'en_produccion' })).toBe('en_produccion')
  })

  it('returns fuera_de_servicio when machine is inactive', () => {
    expect(getMachineStatusKey({ machine_status: 'unknown', is_active: false })).toBe('fuera_de_servicio')
  })

  it('returns sin_registro when no status is set and machine is active', () => {
    expect(getMachineStatusKey({ machine_status: null, is_active: true })).toBe('sin_registro')
  })
})
