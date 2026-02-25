// src/types.ts

export interface TaxBreakdown {
    state_rate: number;
    county_rate: number;
    city_rate: number;
    special_rates: number;
}

export interface ProcessedOrder {
    id: number;
    longitude: number;
    latitude: number;
    timestamp: string;
    subtotal: number;

    // Розраховані дані (те, що вимагає ТЗ)
    composite_tax_rate: number;
    tax_amount: number;
    total_amount: number;
    breakdown: TaxBreakdown;
    jurisdictions: string[]; // бонусне завдання з ТЗ
}