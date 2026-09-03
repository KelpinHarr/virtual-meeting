export default function SessionCard({ session, onAction, actionLabel, actionColor = 'btn-primary' }) {
  const statusColors = {
    waiting: 'bg-amber-100 text-amber-800 border border-amber-200',
    live: 'bg-teal-100 text-teal-800 border border-teal-200',
    ended: 'bg-navy-100 text-navy-500 border border-navy-200',
  };

  const statusLabels = {
    waiting: 'Menunggu',
    live: '🔴 Live',
    ended: 'Selesai',
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-200 border border-navy-100 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-navy-900 text-base">
              Sesi #{session.id}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusColors[session.status] || statusColors.waiting}`}
              >
                {statusLabels[session.status] || session.status}
              </span>
              {session.qa_open && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                  ✋ Q&A Dibuka
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-navy-50 p-2.5 rounded-xl">
            <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider block">Kode Sesi</span>
            <code className="text-primary-600 font-extrabold text-base tracking-wide">
              {session.session_code}
            </code>
          </div>
          <div className="bg-navy-50 p-2.5 rounded-xl">
            <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider block">Speaker</span>
            <span className="font-semibold text-navy-900 truncate block">
              {session.speaker?.display_name || '-'}
            </span>
          </div>
        </div>
      </div>

      {onAction && session.status !== 'ended' && (
        <div className="mt-5 pt-3 border-t border-navy-100">
          <button onClick={() => onAction(session)} className={`w-full py-2.5 font-bold ${actionColor}`}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
