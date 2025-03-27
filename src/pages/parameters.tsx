import OracleParameters from '@/components/Parameters/OracleParameters'
import RegistryParameters from '@/components/Parameters/RegistryParameters'
import DisputeParameters from '@/components/Parameters/DisputeParameters'
import ReporterParameters from '@/components/Parameters/ReporterParameters'

export default function Parameters() {
  return (
    <div>
      <OracleParameters />
      <RegistryParameters />
      <DisputeParameters />
      <ReporterParameters />
    </div>
  )
}
