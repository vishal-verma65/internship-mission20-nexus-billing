export const formatMoney = (amount, currency) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits;
  return formatter.format(amount / 10 ** digits);
};

export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
