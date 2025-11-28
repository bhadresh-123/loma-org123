/**
 * MCC Code Categorization Service
 * Maps Stripe MCC codes to business categories and tax deductibility
 */

export interface TransactionCategory {
  category: string;
  subcategory: string;
  taxDeductible: boolean;
  description: string;
}

// MCC Code to Category Mapping
export const MCC_CATEGORIES: Record<string, TransactionCategory> = {
  // Professional Services
  '8931': { category: 'Professional Services', subcategory: 'Accounting', taxDeductible: true, description: 'Accounting/Bookkeeping Services' },
  '8111': { category: 'Professional Services', subcategory: 'Legal', taxDeductible: true, description: 'Legal Services' },
  '8299': { category: 'Professional Services', subcategory: 'Consulting', taxDeductible: true, description: 'Professional Services' },
  '8398': { category: 'Professional Services', subcategory: 'Charitable', taxDeductible: true, description: 'Charitable Organizations' },
  
  // Office Supplies & Equipment
  '5943': { category: 'Office', subcategory: 'Stationery', taxDeductible: true, description: 'Office/Stationery Supplies' },
  '5732': { category: 'Office', subcategory: 'Electronics', taxDeductible: true, description: 'Electronics/Computer Equipment' },
  '5734': { category: 'Office', subcategory: 'Computer Software', taxDeductible: true, description: 'Computer Software' },
  '5045': { category: 'Office', subcategory: 'Office Equipment', taxDeductible: true, description: 'Office Equipment' },
  
  // Business Services
  '4816': { category: 'Business Services', subcategory: 'Communication', taxDeductible: true, description: 'Computer Network Services' },
  '7372': { category: 'Business Services', subcategory: 'IT Services', taxDeductible: true, description: 'Computer Programming Services' },
  '7379': { category: 'Business Services', subcategory: 'IT Services', taxDeductible: true, description: 'Computer Maintenance Services' },
  '4814': { category: 'Business Services', subcategory: 'Communication', taxDeductible: true, description: 'Telecommunications' },
  '4899': { category: 'Business Services', subcategory: 'Communication', taxDeductible: true, description: 'Cable/Utilities' },
  
  // Transportation
  '5542': { category: 'Transportation', subcategory: 'Fuel', taxDeductible: true, description: 'Automated Fuel Dispensers' },
  '5541': { category: 'Transportation', subcategory: 'Fuel', taxDeductible: true, description: 'Service Stations' },
  '4121': { category: 'Transportation', subcategory: 'Taxi/Rideshare', taxDeductible: true, description: 'Taxicabs/Limousines' },
  '4131': { category: 'Transportation', subcategory: 'Transit', taxDeductible: true, description: 'Bus Lines' },
  '3000': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Airlines' },
  '3001': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'American Airlines' },
  '3002': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Air Canada' },
  '3003': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Air France' },
  '3004': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Lufthansa' },
  '3005': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'British Airways' },
  '3006': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'JAL' },
  '3007': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Air Inter' },
  '3008': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'KLM' },
  '3009': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Delta' },
  '3010': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Northwest' },
  '3011': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'TWA' },
  '3012': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'United' },
  '3013': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'US Airways' },
  '3014': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'AirTran' },
  '3015': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Alaska Airlines' },
  '3016': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'JetBlue' },
  '3017': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Virgin America' },
  '3018': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Southwest' },
  '3019': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Spirit Airlines' },
  '3020': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Frontier Airlines' },
  '3021': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Hawaiian Airlines' },
  '3022': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Allegiant Air' },
  '3023': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Sun Country Airlines' },
  '3024': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Breeze Airways' },
  '3025': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Avelo Airlines' },
  '3026': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3027': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3028': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3029': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3030': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3031': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3032': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3033': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3034': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3035': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3036': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3037': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3038': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3039': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3040': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3041': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3042': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3043': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3044': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3045': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3046': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3047': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3048': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3049': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3050': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3051': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3052': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3053': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3054': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3055': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3056': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3057': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3058': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3059': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3060': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3061': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3062': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3063': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3064': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3065': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3066': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3067': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3068': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3069': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3070': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3071': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3072': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3073': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3074': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3075': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3076': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3077': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3078': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3079': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3080': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3081': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3082': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3083': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3084': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3085': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3086': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3087': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3088': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3089': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3090': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3091': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3092': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3093': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3094': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3095': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3096': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3097': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3098': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3099': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3100': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3101': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3102': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3103': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3104': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3105': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3106': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3107': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3108': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3109': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3110': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3111': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3112': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3113': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3114': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3115': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3116': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3117': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3118': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3119': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3120': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3121': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3122': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3123': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3124': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3125': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3126': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3127': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3128': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3129': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3130': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3131': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3132': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3133': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3134': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3135': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3136': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3137': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3138': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3139': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3140': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3141': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3142': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3143': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3144': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3145': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3146': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3147': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3148': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3149': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3150': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3151': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3152': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3153': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3154': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3155': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3156': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3157': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3158': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3159': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3160': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3161': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3162': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3163': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3164': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3165': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3166': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3167': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3168': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3169': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3170': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3171': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3172': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3173': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3174': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3175': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3176': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3177': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3178': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3179': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3180': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3181': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3182': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3183': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3184': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3185': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3186': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3187': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3188': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3189': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3190': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3191': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3192': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3193': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3194': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3195': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3196': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3197': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3198': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3199': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3200': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3201': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3202': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3203': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3204': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3205': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3206': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3207': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3208': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3209': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3210': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3211': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3212': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3213': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3214': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3215': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3216': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3217': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3218': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3219': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3220': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3221': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3222': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3223': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3224': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3225': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3226': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3227': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3228': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3229': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3230': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3231': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3232': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3233': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3234': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3235': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3236': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3237': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3238': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3239': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3240': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3241': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3242': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3243': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3244': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3245': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3246': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3247': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3248': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3249': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3250': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3251': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3252': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3253': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3254': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3255': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3256': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3257': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3258': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3259': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3260': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3261': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3262': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3263': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3264': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3265': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3266': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3267': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3268': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3269': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3270': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3271': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3272': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3273': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3274': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3275': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3276': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3277': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3278': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3279': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3280': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3281': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3282': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3283': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3284': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3285': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3286': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3287': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3288': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3289': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3290': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3291': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3292': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3293': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3294': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3295': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3296': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3297': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3298': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  '3299': { category: 'Transportation', subcategory: 'Airlines', taxDeductible: true, description: 'Other Airlines' },
  
  // Lodging
  '3500': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Lodging - Hotels/Motels' },
  '3501': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Holiday Inn' },
  '3502': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Best Western' },
  '3503': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Sheraton' },
  '3504': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Hilton' },
  '3505': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Marriott' },
  '3506': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Days Inn' },
  '3507': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Westin' },
  '3508': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'La Quinta' },
  '3509': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Hampton Inn' },
  '3510': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Hyatt' },
  '3511': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Motel 6' },
  '3512': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Embassy Suites' },
  '3513': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Doubletree' },
  '3514': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Red Roof Inn' },
  '3515': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Comfort Inn' },
  '3516': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Clarion' },
  '3517': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Quality Inn' },
  '3518': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Residence Inn' },
  '3519': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Courtyard' },
  '3520': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Fairfield Inn' },
  '3521': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'SpringHill Suites' },
  '3522': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Four Points' },
  '3523': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Omni Hotels' },
  '3524': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'IHG Hotels' },
  '3525': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Extended Stay' },
  '3526': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Homewood Suites' },
  '3527': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Home2 Suites' },
  '3528': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Tru by Hilton' },
  '3529': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3530': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3531': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3532': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3533': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3534': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3535': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3536': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3537': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3538': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3539': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3540': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3541': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3542': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3543': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3544': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3545': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3546': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3547': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3548': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3549': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3550': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3551': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3552': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3553': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3554': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3555': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3556': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3557': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3558': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3559': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3560': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3561': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3562': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3563': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3564': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3565': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3566': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3567': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3568': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3569': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3570': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3571': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3572': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3573': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3574': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3575': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3576': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3577': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3578': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3579': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3580': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3581': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3582': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3583': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3584': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3585': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3586': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3587': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3588': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3589': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3590': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3591': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3592': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3593': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3594': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3595': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3596': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3597': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3598': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  '3599': { category: 'Travel', subcategory: 'Lodging', taxDeductible: true, description: 'Other Hotels' },
  
  // Car Rental
  '3351': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Avis' },
  '3352': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Hertz' },
  '3353': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Budget' },
  '3354': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'National' },
  '3355': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Alamo' },
  '3356': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Thrifty' },
  '3357': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Dollar' },
  '3358': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Enterprise' },
  '3359': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Payless' },
  '3360': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Zipcar' },
  '3361': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Turo' },
  '3362': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Sixt' },
  '3363': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Advantage' },
  '3364': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Ace' },
  '3365': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Fox' },
  '3366': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Europcar' },
  '3367': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3368': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3369': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3370': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3371': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3372': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3373': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3374': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3375': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3376': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3377': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3378': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3379': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3380': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3381': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3382': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3383': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3384': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3385': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3386': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3387': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3388': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3389': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3390': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3391': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3392': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3393': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3394': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3395': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3396': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3397': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3398': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  '3399': { category: 'Transportation', subcategory: 'Car Rental', taxDeductible: true, description: 'Other Car Rental' },
  
  // Restaurants & Food
  '5812': { category: 'Meals & Entertainment', subcategory: 'Restaurants', taxDeductible: true, description: 'Restaurants' },
  '5813': { category: 'Meals & Entertainment', subcategory: 'Bars', taxDeductible: true, description: 'Bars/Taverns' },
  '5814': { category: 'Meals & Entertainment', subcategory: 'Fast Food', taxDeductible: true, description: 'Fast Food' },
  '5499': { category: 'Meals & Entertainment', subcategory: 'Food', taxDeductible: true, description: 'Food/Beverage Stores' },
  '5411': { category: 'Meals & Entertainment', subcategory: 'Groceries', taxDeductible: false, description: 'Grocery Stores' },
  '5422': { category: 'Meals & Entertainment', subcategory: 'Food', taxDeductible: true, description: 'Meat/Seafood Markets' },
  '5451': { category: 'Meals & Entertainment', subcategory: 'Food', taxDeductible: true, description: 'Dairy Products' },
  '5462': { category: 'Meals & Entertainment', subcategory: 'Food', taxDeductible: true, description: 'Bakeries' },
  
  // Healthcare (generally not deductible for therapists as business expense)
  '8011': { category: 'Healthcare', subcategory: 'Medical', taxDeductible: false, description: 'Doctors' },
  '8021': { category: 'Healthcare', subcategory: 'Dental', taxDeductible: false, description: 'Dentists' },
  '8031': { category: 'Healthcare', subcategory: 'Chiropractic', taxDeductible: false, description: 'Chiropractors' },
  '8041': { category: 'Healthcare', subcategory: 'Osteopathic', taxDeductible: false, description: 'Osteopathic Physicians' },
  '8042': { category: 'Healthcare', subcategory: 'Optometry', taxDeductible: false, description: 'Optometrists' },
  '8043': { category: 'Healthcare', subcategory: 'Ophthalmology', taxDeductible: false, description: 'Ophthalmologists' },
  '8049': { category: 'Healthcare', subcategory: 'Podiatry', taxDeductible: false, description: 'Podiatrists' },
  '8050': { category: 'Healthcare', subcategory: 'Nursing', taxDeductible: false, description: 'Nursing Care' },
  '8062': { category: 'Healthcare', subcategory: 'Hospitals', taxDeductible: false, description: 'Hospitals' },
  '8071': { category: 'Healthcare', subcategory: 'Medical Labs', taxDeductible: false, description: 'Medical Labs' },
  '8099': { category: 'Healthcare', subcategory: 'Other Medical', taxDeductible: false, description: 'Other Medical Services' },
  
  // Continuing Education & Training
  '8299': { category: 'Professional Development', subcategory: 'Training', taxDeductible: true, description: 'Professional Services/Training' },
  '8220': { category: 'Professional Development', subcategory: 'Education', taxDeductible: true, description: 'Colleges/Universities' },
  '8244': { category: 'Professional Development', subcategory: 'Education', taxDeductible: true, description: 'Business/Professional Schools' },
  '8249': { category: 'Professional Development', subcategory: 'Education', taxDeductible: true, description: 'Trade/Vocational Schools' },
  '8351': { category: 'Professional Development', subcategory: 'Education', taxDeductible: true, description: 'Child Care Services' },
  
  // Insurance
  '6300': { category: 'Insurance', subcategory: 'Insurance', taxDeductible: true, description: 'Insurance Sales' },
  '6381': { category: 'Insurance', subcategory: 'Life Insurance', taxDeductible: true, description: 'Life Insurance' },
  '6399': { category: 'Insurance', subcategory: 'Other Insurance', taxDeductible: true, description: 'Other Insurance' },
  
  // Subscriptions & Software
  '5817': { category: 'Business Services', subcategory: 'Software', taxDeductible: true, description: 'Digital Goods' },
  '5968': { category: 'Business Services', subcategory: 'Software', taxDeductible: true, description: 'Subscription Services' },
  
  // Parking & Tolls
  '7523': { category: 'Transportation', subcategory: 'Parking', taxDeductible: true, description: 'Parking/Garages' },
  '4784': { category: 'Transportation', subcategory: 'Tolls', taxDeductible: true, description: 'Tolls/Bridge Fees' },
  
  // Utilities
  '4900': { category: 'Utilities', subcategory: 'Utilities', taxDeductible: true, description: 'Utilities - General' },
  '4814': { category: 'Utilities', subcategory: 'Communication', taxDeductible: true, description: 'Telecommunications' },
  '4821': { category: 'Utilities', subcategory: 'Communication', taxDeductible: true, description: 'Telegraph Services' },
  '4899': { category: 'Utilities', subcategory: 'Utilities', taxDeductible: true, description: 'Cable/Utilities' },
  
  // Retail (generally not deductible unless specifically for business)
  '5309': { category: 'Retail', subcategory: 'Department Stores', taxDeductible: false, description: 'Department Stores' },
  '5311': { category: 'Retail', subcategory: 'Department Stores', taxDeductible: false, description: 'Department Stores' },
  '5331': { category: 'Retail', subcategory: 'Variety Stores', taxDeductible: false, description: 'Variety Stores' },
  '5399': { category: 'Retail', subcategory: 'Miscellaneous', taxDeductible: false, description: 'Misc. General Merchandise' },
  
  // Default fallback
  '0000': { category: 'Other', subcategory: 'Other', taxDeductible: true, description: 'Other/Unknown' }
};

/**
 * Categorize a transaction based on MCC code
 */
export function categorizeTransaction(mccCode?: string, description?: string): TransactionCategory {
  if (!mccCode) {
    // Try to categorize by description if no MCC code
    return categorizeByDescription(description);
  }
  
  const category = MCC_CATEGORIES[mccCode];
  if (category) {
    return category;
  }
  
  // Try to categorize by description as fallback
  return categorizeByDescription(description);
}

/**
 * Categorize transaction by description when MCC is not available
 */
const categorizeByDescription = (description?: string): TransactionCategory => {
  if (!description) {
    return MCC_CATEGORIES['0000'];
  }
  
  const desc = description.toLowerCase();
  
  // Software and subscription services
  if (desc.includes('google') || desc.includes('microsoft') || desc.includes('adobe') || 
      desc.includes('slack') || desc.includes('zoom') || desc.includes('office 365') ||
      desc.includes('dropbox') || desc.includes('salesforce') || desc.includes('hubspot')) {
    return { category: 'Business Services', subcategory: 'Software', taxDeductible: true, description: 'Business Software' };
  }
  
  // Professional services
  if (desc.includes('accountant') || desc.includes('lawyer') || desc.includes('attorney') ||
      desc.includes('consultant') || desc.includes('cpa') || desc.includes('bookkeeping')) {
    return { category: 'Professional Services', subcategory: 'Professional', taxDeductible: true, description: 'Professional Services' };
  }
  
  // Restaurants and food (deductible for business meals)
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('diner') ||
      desc.includes('bistro') || desc.includes('grill') || desc.includes('bar') ||
      desc.includes('pizza') || desc.includes('burger') || desc.includes('starbucks') ||
      desc.includes('coffee') || desc.includes('doordash') || desc.includes('uber eats') ||
      desc.includes('grubhub') || desc.includes('postmates')) {
    return { category: 'Meals & Entertainment', subcategory: 'Business Meals', taxDeductible: true, description: 'Business Meals' };
  }
  
  // Transportation
  if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') ||
      desc.includes('gas') || desc.includes('fuel') || desc.includes('parking') ||
      desc.includes('airline') || desc.includes('flight') || desc.includes('hotel') ||
      desc.includes('rental car') || desc.includes('hertz') || desc.includes('avis')) {
    return { category: 'Transportation', subcategory: 'Business Travel', taxDeductible: true, description: 'Business Transportation' };
  }
  
  // Office supplies
  if (desc.includes('office') || desc.includes('staples') || desc.includes('depot') ||
      desc.includes('supplies') || desc.includes('paper') || desc.includes('printer') ||
      desc.includes('amazon') || desc.includes('walmart') || desc.includes('target')) {
    return { category: 'Office', subcategory: 'Office Supplies', taxDeductible: true, description: 'Office Supplies' };
  }
  
  // Utilities and communication
  if (desc.includes('internet') || desc.includes('phone') || desc.includes('verizon') ||
      desc.includes('att') || desc.includes('comcast') || desc.includes('xfinity') ||
      desc.includes('sprint') || desc.includes('t-mobile')) {
    return { category: 'Utilities', subcategory: 'Communication', taxDeductible: true, description: 'Business Communications' };
  }
  
  // Default to Other but likely deductible for business use
  return { category: 'Other', subcategory: 'Business Expense', taxDeductible: true, description: 'Other Business Expense' };
};

/**
 * Get all unique categories
 */
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  Object.values(MCC_CATEGORIES).forEach(cat => categories.add(cat.category));
  return Array.from(categories).sort();
}

/**
 * Get subcategories for a specific category
 */
export const getSubcategories = (category: string): string[] => {
  const subcategories = new Set<string>();
  Object.values(MCC_CATEGORIES)
    .filter(cat => cat.category === category)
    .forEach(cat => subcategories.add(cat.subcategory));
  return Array.from(subcategories).sort();
}