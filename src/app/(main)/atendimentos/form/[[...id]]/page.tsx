'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TitleCards from '@/components/TitleCards';

export default function FormAtendimentoPage() {
  const params = useParams();
  const { id } = params as { id: string[] } | null;

  return (
    <div className="grid">
      <div className="card col-10 col-offset-1 shadow-1 flex flex-column justify-content-center">
        <TitleCards title="Cadastro de atendimento" />
        <div className="p-card-content">
          

        </div>
      </div>
    </div>
  );
}

