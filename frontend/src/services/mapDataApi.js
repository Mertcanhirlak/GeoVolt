const API_BASE_URL = "http://localhost:5000/api";

const localMockChargingStations = [
  {
    id: 1,
    name: "Çankaya Mevcut Şarj İstasyonu",
    companyName: "ZES",
    address: "Çankaya / Ankara",
    region: "Çankaya",
    neighborhood: "Kızılay",
    socketType: "Type 2",
    powerKw: 22
  },
  {
    id: 2,
    name: "Söğütözü Mevcut Şarj İstasyonu",
    companyName: "Eşarj",
    address: "Söğütözü / Ankara",
    region: "Çankaya",
    neighborhood: "Söğütözü",
    socketType: "CCS",
    powerKw: 50
  },
  {
    id: 3,
    name: "Batıkent Mevcut Şarj İstasyonu",
    companyName: "Voltrun",
    address: "Yenimahalle / Ankara",
    region: "Yenimahalle",
    neighborhood: "Batıkent",
    socketType: "Type 2",
    powerKw: 22
  },
  {
    id: 4,
    name: "Eryaman Mevcut Şarj İstasyonu",
    companyName: "Sharz",
    address: "Etimesgut / Ankara",
    region: "Etimesgut",
    neighborhood: "Eryaman",
    socketType: "CCS",
    powerKw: 60
  }
];

export async function getChargingStations() {
  try {
    const response = await fetch(`${API_BASE_URL}/charging-stations`);

    if (!response.ok) {
      return {
        source: "local-mock",
        data: localMockChargingStations
      };
    }

    const data = await response.json();

    return {
      source: "api",
      data: data.data || data
    };
  } catch (error) {
    return {
      source: "local-mock",
      data: localMockChargingStations
    };
  }
}