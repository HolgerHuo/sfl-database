export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white py-6 mt-auto w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-sm text-blue-100">© { new Date().getFullYear() } 人物数据库. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
