package database

import (
	"log"
	"starter/backend/models"
)

// seedCustomers injects the initial customer master list when the customers table is empty.
func seedCustomers() error {
	var count int64
	if err := DB.Unscoped().Model(&models.Customer{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	customers := []models.Customer{
		{Code: "CUST-42937923", Name: "Alwa Guslim", CustomerType: "Guest", Phone: "+628117328833", Address: "Jl. Serayu no. 25 RT 11 RW 03 Padang Harapan Kec. Gading Cempaka", Subdistrict: "Gading Cempaka", City: "Bengkulu - Kota", Province: "Bengkulu", PostalCode: "38225", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-20005160", Name: "Basuki", CustomerType: "Guest", Phone: "+62 811-372-453", Address: "Natura Residences. Springfield A1/ 24. Siwalanpanji.", Subdistrict: "Buduran", City: "Sidoarjo - Kabupaten", Province: "Jawa Timur", PostalCode: "61252", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-19087194", Name: "Dino Hermawan", CustomerType: "Guest", Phone: "+6282137966999", Address: "Perumahan De'eaganice No.7 Jl. Suko Legok 3 RT 16 RW 06 Suko", Subdistrict: "Sukodono", City: "Sidoarjo - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "PLDO", Name: "Dodik Tan", CustomerType: "Guest", Phone: "+6281252372997", Address: "Jl.Jembawan IX Blok 3H no.25 Ds.Mangliwan", Subdistrict: "Pakis", City: "Malang - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-45401002", Name: "dr. Afif", CustomerType: "Guest", Phone: "+6285645254098", Address: "Jl. dr. Wahidin no.18 (rumah pink seberang grapari telkomsel)", Subdistrict: "Bojonegoro", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-44697373", Name: "dr. Amir Hasan", CustomerType: "Guest", Phone: "+6281233954392", Address: "Rungkut Barata Gang 18 Nomor 18", Subdistrict: "Gununganyar", City: "Surabaya - Kota", Province: "Jawa Timur", PostalCode: "60293", DefaultTermDays: 30, IsActive: true},
		{Code: "DAD", Name: "Dr. Antonius Dwi Juniarto,Sp.M", CustomerType: "Guest", Phone: "+6281802237115", Address: "Jl. Lotus Utama Blok IC01 Closter Lotus Lakeside kelurahan Harapan Mulya", Subdistrict: "Medan Satria", City: "Bekasi - Kota", Province: "Jawa Barat", PostalCode: "17143", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-24115836", Name: "Dr. Dedik Ipung,SpM", CustomerType: "Guest", Phone: "+628123058625", Address: "Jl Taman Indah I No.5,Menanggal", Subdistrict: "Gayungan", City: "Surabaya - Kota", Province: "Jawa Timur", PostalCode: "60234", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-21188991", Name: "dr. Dilly", CustomerType: "Guest", Phone: "+6281217278876", Address: "Jl.Manyar Sambongan No.39", Subdistrict: "Gubeng", City: "Surabaya - Kota", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-19502028", Name: "dr. Frisma Sagara Sp.M.M.Ked,Klin", CustomerType: "Guest", Phone: "+6281348500203", Address: "Jl. Pramuka KM 2,5 ruko mentaya Riverside", Subdistrict: "Teluk Sampit", City: "Kotawaringin Timur - Kabupaten", Province: "Kalimantan Tengah", PostalCode: "74312", DefaultTermDays: 30, IsActive: true},
		{Code: "PLHBT", Name: "dr. Haryo Bagus, Sp.M", CustomerType: "Guest", Phone: "+6285646200900", Address: "Jl. Cendekia No.8", Subdistrict: "Bojonegoro", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", PostalCode: "62181", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-45242194", Name: "dr. Hasya", CustomerType: "Guest", Phone: "+6282141587898", Address: "Perum. Graha Atmaja no 13 Kalianyar Kapas Bojonegoro", Subdistrict: "Kapas", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "KH", Name: "dr. Kholid, Sp.M", CustomerType: "Guest", Phone: "+6281330473281", Address: "Jl. Kinibalu Blok L11 Perum Puri Tuban Indah Latsari", Subdistrict: "Tuban", City: "Tuban - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-30536915", Name: "dr. Kurnia", CustomerType: "Guest", Phone: "+6285746841213", Address: "Jl. Purimas Regency B1 no 5 Gunung Anyar Surabaya", Subdistrict: "Gununganyar", City: "Surabaya - Kota", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "PLBEK", Name: "dr. Tri Subekti, Sp.M", CustomerType: "Guest", Phone: "+6281223608087", Address: "Gateway Pasteur Residence, Cluster Emerald Jl. Emerald Raya No. 17, Kel. Sukaraja, Kec. Cicendo, Kota Bandung, Jawa Barat, 40175", Subdistrict: "Cicendo", City: "Bandung - Kota", Province: "Jawa Barat", PostalCode: "40175", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-42278416", Name: "dr. witha sp.M", CustomerType: "Guest", Phone: "+6281216830527", Address: "Jl Abdul Munir RT 19 RW 05 No 121, kelurahan kandang limun, kecamatan muara Bangka hulu, Bengkulu. 38123", Subdistrict: "Muara Bangka Hulu", City: "Bengkulu - Kota", Province: "Bengkulu", PostalCode: "38123", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-20185726", Name: "dr.TRi Subekti Sp.M ( Bonus)", CustomerType: "Guest", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-20004989", Name: "dr.Vinca Desyandri,Sp.M", CustomerType: "Guest", Phone: "0315947530", Subdistrict: "Balen", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-45038485", Name: "Edi Alcon", CustomerType: "Guest", Phone: "+628563940444", Subdistrict: "Kapas", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-24606499", Name: "EDIT STOK", CustomerType: "Guest", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-35350277", Name: "Eko Widayanto", CustomerType: "Guest", Phone: "+6281330415042", Address: "Jl. Diponegoro RT 06 RW 01 depan Navagreen Desa Dengok Kecamtan Padangan Kabupaten Bojonegoro", Subdistrict: "Padangan", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", PostalCode: "62162", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-27369753", Name: "Fernando", CustomerType: "Guest", Phone: "+6285290851481", Subdistrict: "Kapas", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "18880550", Name: "Kiky Dedy Santoso", CustomerType: "Guest", Phone: "+6285230599135", Address: "Perum. Beluru Permai blok BA 2 dekat Toko Salsa Baby Shop Kab. Sidoarjo Jawa Timur", Subdistrict: "Sidoarjo", City: "Sidoarjo - Kabupaten", Province: "Jawa Timur", PostalCode: "61211", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-21721450", Name: "Klinik Mata dr Haryo Bojonegoro", CustomerType: "Guest", Address: "Jl. Ade Irma Suryani No.7", Subdistrict: "Bojonegoro", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-20749253", Name: "Klinik Mata dr Haryo Surabaya", CustomerType: "Guest", Phone: "+6282231198000", Address: "Jl.Rungkut Asri Utara XIII/10", Subdistrict: "Rungkut", City: "Surabaya - Kota", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-20039997", Name: "Klinik Mata Tritya (dhila)", CustomerType: "Guest", Phone: "+6282233359110", Subdistrict: "Balen", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-48004564", Name: "Mahmudi", CustomerType: "Guest", Phone: "+6282242985814", Address: "Jl Anggeng Jaya III Sidokumpul RT 006 RW 001", Subdistrict: "Guntur", City: "Demak - Kabupaten", Province: "Jawa Tengah", PostalCode: "59565", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-19087019", Name: "Parno", CustomerType: "Guest", Phone: "+6281252732805", Address: "Jl. Bulak Rukem Timur 1D No.9", Subdistrict: "Kapas", City: "Surabaya - Kota", Province: "Jawa Timur", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-32757912", Name: "Petrus Mariyono", CustomerType: "Guest", Phone: "+62811307621", Address: "Perum Tiara Residence Kav. 33 Kebonagung", Subdistrict: "Kraksaan", City: "Probolinggo - Kabupaten", Province: "Jawa Timur", PostalCode: "67282", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-29093824", Name: "PT Faiza Bakti Medika", CustomerType: "Guest", Phone: "+6287852324089", Address: "Jl. Bonoro No. 161 RT 10 RW 04 Kelurahan Lawangan Daya Pandemawu", Subdistrict: "Pademawu", City: "Pamekasan - Kabupaten", Province: "Jawa Timur", PostalCode: "69323", DefaultTermDays: 30, IsActive: true},
		{Code: "CUST-44690934", Name: "RS BHAYANGKARA", CustomerType: "Guest", Phone: "+6281299099228", Address: "Jl. Panglima Sudirman No. 160 Klangon", Subdistrict: "Bojonegoro", City: "Bojonegoro - Kabupaten", Province: "Jawa Timur", PostalCode: "62113", DefaultTermDays: 30, IsActive: true},
		{Code: "PLYD", Name: "Yudi", CustomerType: "Guest", Phone: "+6285711938320", Address: "Jl. Pawiyatan Luhur Selatan VI No.4 RT3/1 Bendan Duwur, Gajah Mungkur", City: "Semarang - Kabupaten", Province: "Jawa Tengah", DefaultTermDays: 30, IsActive: true},
	}

	for i := range customers {
		if err := DB.Create(&customers[i]).Error; err != nil {
			return err
		}
	}
	log.Printf("Seeded %d initial customers from Daftar Pelanggan.xlsx", len(customers))
	return nil
}
