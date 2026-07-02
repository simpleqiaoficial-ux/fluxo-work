// Validação estrutural (dígitos verificadores) apenas — não confirma que o CNPJ existe
// ou está ativo na Receita Federal. Essa confirmação é responsabilidade da integração
// com a CNPJá, isolada atrás de uma interface própria (ver src/providers/cnpj-lookup).
export function isValidCnpj(rawCnpj: string): boolean {
  const cnpj = rawCnpj.replace(/\D/g, '');

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calcCheckDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstDigit = calcCheckDigit(cnpj.slice(0, 12), weightsFirst);
  const secondDigit = calcCheckDigit(
    cnpj.slice(0, 12) + firstDigit,
    weightsSecond,
  );

  return cnpj === cnpj.slice(0, 12) + String(firstDigit) + String(secondDigit);
}
