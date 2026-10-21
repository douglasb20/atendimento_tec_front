import { Metadata } from 'next';

import AgendaSection from './_AgendaSection';

export const metadata: Metadata = { title: 'Agenda' };

export default function AgendaPage() {
  return <AgendaSection />;
}
