import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Text("AirAstro")
                .font(.largeTitle)
            Text("Connecting...")
        }
        .padding()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
