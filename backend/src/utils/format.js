export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function isValidCpf(value = '') {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const result = (sum * 10) % 11;

    return result === 10 ? 0 : result;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

export function firstName(fullName = '') {
  return String(fullName).trim().split(/\s+/)[0] || fullName;
}

export function toBooleanInt(value) {
  return value ? 1 : 0;
}
