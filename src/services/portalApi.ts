import axios from 'axios';

export const checkDiscount = async (email: string): Promise<string> => {
  try {
    const response = await axios.post('https://portalmasterov.ru/api/discount', {
      email
    });
    return response.data;
  } catch (error) {
    console.error('Error checking discount:', error);
    return 'Ошибка при проверке скидки';
  }
};