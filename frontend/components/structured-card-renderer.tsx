import React from 'react';
import { StructuredData } from '../lib/types';
import { CNPSCard } from './structured-cards/CNPSCard';
import { PayrollTaxCard } from './structured-cards/PayrollTaxCard';
import { VATCard } from './structured-cards/VATCard';
import { ValidationCard } from './structured-cards/ValidationCard';
import { EconomicIndicatorCard } from './structured-cards/EconomicIndicatorCard';
import { ShieldAlert } from 'lucide-react';

interface StructuredCardRendererProps {
  structured: StructuredData;
}

export function StructuredCardRenderer({ structured }: StructuredCardRendererProps) {
  const { type, data } = structured;

  if (!data) return null;

  try {
    switch (type) {
      case 'cnps_table':
        return <CNPSCard data={data} />;
      case 'payroll_tax_summary':
        return <PayrollTaxCard data={data} />;
      case 'vat_summary':
        return <VATCard data={data} />;
      case 'validation_result':
        return <ValidationCard data={data} />;
      case 'indicator_chart':
        return <EconomicIndicatorCard data={data} />;
      default:
        console.warn(`Type de carte structurÃ©e inconnu: ${type}`);
        return (
          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-300 text-xs flex gap-2 items-start my-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">DonnÃ©es structurÃ©es non reconnues</span>
              <span>Le type de carte "{type}" n'est pas supportÃ© par cette version de l'interface.</span>
            </div>
          </div>
        );
    }
  } catch (error) {
    console.error(`Echec de rendu pour la carte ${type}:`, error);
    return (
      <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-300 text-xs flex gap-2 items-start my-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Erreur d'affichage</span>
          <span>Une erreur s'est produite lors de la mise en forme des donnÃ©es de la carte.</span>
        </div>
      </div>
    );
  }
}
