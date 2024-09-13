import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import CardPlans from './CardPlans';

const Plans = () => {
  let plans = [];

  const hasParticipante = cookies().has('participante');
  if (hasParticipante) {
    const participante = JSON.parse(cookies().get('participante')?.value);
    plans = participante;
  } else {
    redirect('/login');
  }

  return <CardPlans plans={plans} />;
};

export default Plans;
