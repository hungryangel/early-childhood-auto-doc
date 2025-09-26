import { ObservationPageClient } from '@/components/observation/ObservationPageClient';

interface Props {
  params: {
    childId: string;
  };
}

export default function Page({ params }: Props) {
  const childId = parseInt(params.childId);

  return <ObservationPageClient childId={childId} />;
}