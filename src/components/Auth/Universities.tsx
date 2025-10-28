export type UniversityOption = {
  label: string;
  value: string;
  domains?: string[];
};

// International (Top 10 Global), sorted A to Z
export const INTERNATIONAL_UNIS: UniversityOption[] = [
  {
    label: 'California Institute of Technology (Caltech)',
    value: 'caltech',
    domains: ['caltech.edu'],
  },
  { label: 'ETH Zurich', value: 'eth-zurich', domains: ['ethz.ch'] },
  { label: 'Harvard University', value: 'harvard', domains: ['harvard.edu'] },
  { label: 'Imperial College London', value: 'imperial', domains: ['imperial.ac.uk'] },
  { label: 'Massachusetts Institute of Technology (MIT)', value: 'mit', domains: ['mit.edu'] },
  { label: 'National University of Singapore (NUS)', value: 'nus', domains: ['nus.edu.sg'] },
  { label: 'Stanford University', value: 'stanford', domains: ['stanford.edu'] },
  { label: 'University College London (UCL)', value: 'ucl', domains: ['ucl.ac.uk'] },
  { label: 'University of Cambridge', value: 'cambridge', domains: ['cam.ac.uk'] },
  { label: 'University of Oxford', value: 'oxford', domains: ['ox.ac.uk'] },
];

// New Zealand, sorted A to Z
export const NZ_UNIS: UniversityOption[] = [
  { label: 'Auckland University of Technology (AUT)', value: 'aut', domains: ['aut.ac.nz'] },
  { label: 'Lincoln University', value: 'lincoln', domains: ['lincoln.ac.nz'] },
  { label: 'Massey University', value: 'massey', domains: ['massey.ac.nz'] },
  { label: 'The University of Auckland', value: 'uoa', domains: ['auckland.ac.nz'] },
  { label: 'University of Canterbury', value: 'canterbury', domains: ['canterbury.ac.nz'] },
  { label: 'University of Otago', value: 'otago', domains: ['otago.ac.nz'] },
  { label: 'University of Waikato', value: 'waikato', domains: ['waikato.ac.nz'] },
  {
    label: 'Victoria University of Wellington',
    value: 'vuw',
    domains: ['vuw.ac.nz', 'wgtn.ac.nz'],
  },
];

// Export full list (International first, then NZ)
export const UNIVERSITY_OPTIONS: UniversityOption[] = [...INTERNATIONAL_UNIS, ...NZ_UNIS];
