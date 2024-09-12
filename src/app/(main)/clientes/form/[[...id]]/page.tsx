'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { ObjectUtils } from 'primereact/utils';
import TitleCards from '@/components/TitleCards';

export default function FormClient() {
  const params = useParams();
  const { id } = params as { id: string[] } | null;

  return (
    <div className="grid">
      <div className="col-10 col-offset-1 card flex flex-column justify-content-center shadow-1">
        <TitleCards
          title="Cadastro de cliente"
        />

        <div className="p-card-content">
          <div className="grid">
            <div className="col-12">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
