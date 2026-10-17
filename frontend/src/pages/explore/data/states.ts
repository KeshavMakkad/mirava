// State / UT profiles shown when a marker is clicked on the atlas map.
export interface StateProfile { image: string; capital: string; languages: string; cuisine: string; festivals: string; arts: string; heritage: string }

export const STATES: Record<string, StateProfile> = {

    "Andhra Pradesh": {
      image: "https://images.unsplash.com/photo-1590050752117-23a9d1b0c8a8?auto=format&fit=crop&w=900&q=80",
      capital: "Amaravati",
      languages: "Telugu, Urdu",
      cuisine: "Pulihora, Gongura Pachadi, Pesarattu",
      festivals: "Ugadi, Sankranti, Tirupati Brahmotsavam",
      arts: "Kalamkari, Kuchipudi, Kondapalli toys",
      heritage: "Amaravati, Lepakshi, Tirumala"
    },

    "Arunachal Pradesh": {
      image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=900&q=80",
      capital: "Itanagar",
      languages: "English, Nyishi, Adi",
      cuisine: "Thukpa, Momos, Zan",
      festivals: "Losar, Solung, Nyokum",
      arts: "Tribal weaving, bamboo craft, masks",
      heritage: "Tawang Monastery, Ziro Valley, Ita Fort"
    },

    "Assam": {
      image: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=900&q=80",
      capital: "Dispur",
      languages: "Assamese, Bodo, Bengali",
      cuisine: "Khar, Masor Tenga, Pitha",
      festivals: "Bihu, Ambubachi Mela, Jonbeel Mela",
      arts: "Muga silk, Sattriya, bamboo craft",
      heritage: "Kamakhya Temple, Sivasagar, Majuli"
    },

    "Bihar": {
      image: "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=900&q=80",
      capital: "Patna",
      languages: "Hindi, Maithili, Bhojpuri",
      cuisine: "Litti Chokha, Thekua, Sattu",
      festivals: "Chhath Puja, Sonepur Mela, Makar Sankranti",
      arts: "Madhubani painting, Sujuni embroidery",
      heritage: "Nalanda, Bodh Gaya, Rajgir"
    },

    "Chhattisgarh": {
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
      capital: "Raipur",
      languages: "Hindi, Chhattisgarhi, Gondi",
      cuisine: "Fara, Chila, Aamat",
      festivals: "Bastar Dussehra, Hareli, Madai",
      arts: "Dhokra, tribal metalwork, Bell-metal craft",
      heritage: "Sirpur, Chitrakote Falls, Bastar"
    },

    "Goa": {
      image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
      capital: "Panaji",
      languages: "Konkani, Marathi, English",
      cuisine: "Goan Fish Curry, Bebinca, Vindaloo",
      festivals: "Carnival, Shigmo, Sao Joao",
      arts: "Azulejo tiles, Kunbi weaving, music",
      heritage: "Old Goa, Basilica of Bom Jesus, Fort Aguada"
    },

    "Gujarat": {
      image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=900&q=80",
      capital: "Gandhinagar",
      languages: "Gujarati, Hindi",
      cuisine: "Dhokla, Undhiyu, Thepla",
      festivals: "Navratri, Uttarayan, Rann Utsav",
      arts: "Bandhani, Patola, Rogan art",
      heritage: "Rani ki Vav, Dholavira, Modhera Sun Temple"
    },


    "Maharashtra": {
      image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80",
      capital: "Mumbai",
      languages: "Marathi, Hindi",
      cuisine: "Puran Poli, Misal Pav, Vada Pav",
      festivals: "Ganesh Chaturthi, Gudi Padwa, Dahi Handi",
      arts: "Warli painting, Paithani, Lavani",
      heritage: "Ajanta, Ellora, Raigad Fort"
    },

    "Manipur": {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
      capital: "Imphal",
      languages: "Meitei, English",
      cuisine: "Eromba, Singju, Chak-hao",
      festivals: "Yaoshang, Lai Haraoba, Ningol Chakouba",
      arts: "Manipuri dance, handloom, pottery",
      heritage: "Kangla Fort, Loktak Lake, Ima Keithel"
    },

    "Meghalaya": {
      image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=900&q=80",
      capital: "Shillong",
      languages: "Khasi, Garo, English",
      cuisine: "Jadoh, Dohneiihong, Tungrymbai",
      festivals: "Wangala, Shad Suk Mynsiem, Nongkrem",
      arts: "Bamboo craft, weaving, tribal music",
      heritage: "Living Root Bridges, Nartiang, Shillong"
    },

    "Mizoram": {
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
      capital: "Aizawl",
      languages: "Mizo, English",
      cuisine: "Bai, Vawksa Rep, Sawhchiar",
      festivals: "Chapchar Kut, Mim Kut, Pawl Kut",
      arts: "Puan weaving, bamboo craft",
      heritage: "Aizawl, Reiek, Mizoram villages"
    },

    "Nagaland": {
      image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
      capital: "Kohima",
      languages: "English, Nagamese, tribal languages",
      cuisine: "Smoked pork, Axone, bamboo shoot dishes",
      festivals: "Hornbill Festival, Moatsu, Sekrenyi",
      arts: "Naga shawls, wood carving, beadwork",
      heritage: "Kohima War Cemetery, Kisama, Dzükou Valley"
    },

    "Odisha": {
      image: "https://images.unsplash.com/photo-1600100397608-f0109b7a4e2a?auto=format&fit=crop&w=900&q=80",
      capital: "Bhubaneswar",
      languages: "Odia, Hindi",
      cuisine: "Dalma, Pakhala Bhata, Chhena Poda",
      festivals: "Rath Yatra, Raja, Nuakhai",
      arts: "Pattachitra, Odissi, silver filigree",
      heritage: "Konark Sun Temple, Jagannath Temple, Udayagiri"
    },

    "Punjab": {
      image: "https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?auto=format&fit=crop&w=900&q=80",
      capital: "Chandigarh",
      languages: "Punjabi, Hindi",
      cuisine: "Sarson da Saag, Makki di Roti, Amritsari Kulcha",
      festivals: "Baisakhi, Lohri, Gurpurab",
      arts: "Phulkari, Bhangra, Punjabi folk music",
      heritage: "Golden Temple, Jallianwala Bagh, Anandpur Sahib"
    },

    "Rajasthan": {
      image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80",
      capital: "Jaipur",
      languages: "Hindi, Rajasthani",
      cuisine: "Dal Baati Churma, Ghevar, Laal Maas",
      festivals: "Gangaur, Teej, Pushkar Fair",
      arts: "Block printing, miniature painting, blue pottery",
      heritage: "Amber Fort, Mehrangarh, Chittorgarh"
    },


    "Sikkim": {
      image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
      capital: "Gangtok",
      languages: "Nepali, Sikkimese, English",
      cuisine: "Momos, Thukpa, Gundruk",
      festivals: "Losar, Pang Lhabsol, Saga Dawa",
      arts: "Thangka painting, carpet weaving",
      heritage: "Rumtek Monastery, Tsomgo Lake, Khangchendzonga"
    },

    "Tamil Nadu": {
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80",
      capital: "Chennai",
      languages: "Tamil, English",
      cuisine: "Dosa, Pongal, Chettinad cuisine",
      festivals: "Pongal, Tamil New Year, Thaipusam",
      arts: "Bharatanatyam, Tanjore painting, bronze sculpture",
      heritage: "Brihadisvara Temple, Mahabalipuram, Madurai"
    },

    "Telangana": {
      image: "https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&w=900&q=80",
      capital: "Hyderabad",
      languages: "Telugu, Urdu",
      cuisine: "Hyderabadi Biryani, Haleem, Sarva Pindi",
      festivals: "Bathukamma, Bonalu, Ugadi",
      arts: "Cheriyal painting, Bidri craft, Perini dance",
      heritage: "Charminar, Golconda Fort, Ramappa Temple"
    },

    "Tripura": {
      image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
      capital: "Agartala",
      languages: "Bengali, Kokborok, English",
      cuisine: "Mui Borok, Chakhwi, Mosdeng",
      festivals: "Kharchi Puja, Garia Puja, Ker Puja",
      arts: "Bamboo craft, handloom, tribal art",
      heritage: "Ujjayanta Palace, Neermahal, Unakoti"
    },

    "Uttar Pradesh": {
      image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80",
      capital: "Lucknow",
      languages: "Hindi, Urdu, Awadhi, Braj",
      cuisine: "Awadhi Biryani, Kachori, Petha",
      festivals: "Holi, Diwali, Kumbh Mela",
      arts: "Chikankari, Kathak, brassware",
      heritage: "Taj Mahal, Varanasi, Fatehpur Sikri"
    },

    "Uttarakhand": {
      image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
      capital: "Dehradun",
      languages: "Hindi, Garhwali, Kumaoni",
      cuisine: "Kafuli, Aloo ke Gutke, Bal Mithai",
      festivals: "Harela, Nanda Devi Raj Jat, Phool Dei",
      arts: "Aipan, wool weaving, folk music",
      heritage: "Kedarnath, Badrinath, Jageshwar"
    },

    "West Bengal": {
      image: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=900&q=80",
      capital: "Kolkata",
      languages: "Bengali, Hindi, English",
      cuisine: "Macher Jhol, Rosogolla, Mishti Doi",
      festivals: "Durga Puja, Poila Boishakh, Kali Puja",
      arts: "Kantha, terracotta, Baul music",
      heritage: "Victoria Memorial, Bishnupur, Sundarbans"
    },

    "Jammu and Kashmir": {
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
      capital: "Srinagar",
      languages: "Kashmiri, Urdu, Dogri",
      cuisine: "Rogan Josh, Yakhni, Kahwa",
      festivals: "Eid, Navroz, Baisakhi",
      arts: "Pashmina, papier-mâché, Kashmiri embroidery",
      heritage: "Mughal Gardens, Dal Lake, Martand Temple"
    },

    "Ladakh": {
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
      capital: "Leh",
      languages: "Ladakhi, Hindi, English",
      cuisine: "Thukpa, Skyu, Momos",
      festivals: "Hemis Festival, Losar, Dosmoche",
      arts: "Thangka, wool weaving, Buddhist art",
      heritage: "Leh Palace, Hemis Monastery, Alchi"
    },

    "Lakshadweep": {
      image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=80",
      capital: "Kavaratti",
      languages: "Malayalam, Mahl, English",
      cuisine: "Tuna dishes, coconut-based curries",
      festivals: "Eid, Milad-un-Nabi",
      arts: "Boat building, coconut craft",
      heritage: "Kavaratti, coral reefs, traditional island culture"
    },

    "Puducherry": {
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80",
      capital: "Puducherry",
      languages: "Tamil, French, English",
      cuisine: "Creole cuisine, seafood, dosa",
      festivals: "Pongal, Bastille Day, Villianur Festival",
      arts: "Kolam, pottery, French-influenced architecture",
      heritage: "French Quarter, Auroville, Basilica of the Sacred Heart"
    }

}

/** Marker positions (only states listed here get a marker, as in the legacy map). */
export const STATE_COORDS: Record<string, [number, number]> = {
        "Arunachal Pradesh": [28.2, 94.7],
        "Assam": [26.2, 92.9],
        "Bihar": [25.9, 85.3],
        "Chhattisgarh": [21.3, 81.9],
        "Goa": [15.3, 74.1],
        "Gujarat": [22.3, 71.2],
        "Haryana": [29.1, 76.1],
        "Himachal Pradesh": [31.1, 77.2],
        "Jharkhand": [23.6, 85.3],
        "Karnataka": [15.3, 75.7],
        "Kerala": [10.8, 76.3],
        "Madhya Pradesh": [23.5, 78.7],
        "Maharashtra": [19.7, 75.7],
        "Manipur": [24.7, 93.9],
        "Meghalaya": [25.5, 91.4],
        "Mizoram": [23.2, 92.9],
        "Nagaland": [26.1, 94.6],
        "Odisha": [20.3, 84.0],
        "Punjab": [31.1, 75.3],
        "Rajasthan": [27.0, 74.2],
        "Sikkim": [27.5, 88.5],
        "Tamil Nadu": [11.1, 78.6],
        "Telangana": [17.9, 79.0],
        "Tripura": [23.9, 91.9],
        "Uttar Pradesh": [26.8, 80.9],
        "Uttarakhand": [30.1, 79.2],
        "West Bengal": [23.0, 87.8],
        "Jammu and Kashmir": [33.8, 75.3],
        "Ladakh": [34.2, 77.6],
        "Lakshadweep": [10.5, 72.6],
        "Puducherry": [11.9, 79.8]
}
