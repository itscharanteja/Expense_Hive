import { Colors } from '../../app/constants/Colors';

describe('Colors', () => {
  it('has all required color constants', () => {
    expect(Colors).toEqual({
      primary: '#6CC24A',
      secondary: '#F7C843',
      accent: '#4BA3E2',
      background: '#F5F5F5',
      text: '#9E9E9E',
      white: '#FFFFFF',
      black: '#000000',
    });
  });

  it('uses valid hex color codes', () => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    Object.values(Colors).forEach(color => {
      expect(color).toMatch(hexColorRegex);
    });
  });
}); 