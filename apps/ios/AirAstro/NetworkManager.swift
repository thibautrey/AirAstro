import Foundation

class NetworkManager {
    static let shared = NetworkManager()
    private init() {}

    private let session = URLSession(configuration: .default)

    func request(_ path: String, completion: @escaping (Result<Data, Error>) -> Void) {
        guard let url = URL(string: "http://raspberrypi.local" + path) else {
            completion(.failure(NSError(domain: "", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        session.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
            } else if let data = data {
                completion(.success(data))
            } else {
                completion(.failure(NSError(domain: "", code: 0, userInfo: [NSLocalizedDescriptionKey: "No data"])))
            }
        }.resume()
    }
}
