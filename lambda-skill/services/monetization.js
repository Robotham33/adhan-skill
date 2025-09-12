import * as Alexa from 'ask-sdk-core';
import { PRODUCTS } from '../config/monetization.js';

export function apiClient(builder) {
  return builder.withApiClient(new Alexa.DefaultApiClient());
}

export async function isPremium(handlerInput) {
  // Si pas encore configuré, on renvoie false proprement
  const pidM = PRODUCTS.PREMIUM_MONTHLY || '';
  const pidY = PRODUCTS.PREMIUM_YEARLY || '';
  const hasIds = pidM.startsWith('amzn1.') || pidY.startsWith('amzn1.');
  if (!hasIds) return false;

  const client = handlerInput.serviceClientFactory.getMonetizationServiceClient();
  const { inSkillProducts = [] } = await client.getInSkillProducts();
  const entitled = inSkillProducts.find(p =>
    (p.productId === pidM || p.productId === pidY) && p.entitled === 'ENTITLED'
  );
  return !!entitled;
}

export function buyMonthlyDirective() {
  return {
    type: 'Connections.SendRequest',
    name: 'Buy',
    payload: { InSkillProduct: { productId: PRODUCTS.PREMIUM_MONTHLY } },
    token: 'buy-premium-monthly'
  };
}

export function buyYearlyDirective() {
  return {
    type: 'Connections.SendRequest',
    name: 'Buy',
    payload: { InSkillProduct: { productId: PRODUCTS.PREMIUM_YEARLY } },
    token: 'buy-premium-yearly'
  };
}
