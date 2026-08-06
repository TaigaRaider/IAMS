const applicants = [
  {
    id: 1,
    name: "John Doe",
    role: "Software Engineer",
    status: "In Review",
    applied: "2026-08-05",
  },
  {
    id: 2,
    name: "Jane Smith",
    role: "Product Designer",
    status: "Shortlisted",
    applied: "2026-08-04",
  },
  {
    id: 3,
    name: "Alex Kim",
    role: "Data Analyst",
    status: "Rejected",
    applied: "2026-08-03",
  },
  {
    id: 4,
    name: "Maria Garcia",
    role: "HR Coordinator",
    status: "Hired",
    applied: "2026-08-02",
  },
  {
    id: 5,
    name: "David Brown",
    role: "Backend Engineer",
    status: "In Review",
    applied: "2026-08-01",
  },
  {
    id: 6,
    name: "Sara Lee",
    role: "UX Researcher",
    status: "Shortlisted",
    applied: "2026-07-30",
  },
];

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("");

function statusClass(status) {
  switch (status) {
    case "Shortlisted":
      return "shortlisted";
    case "Rejected":
      return "rejected";
    case "Hired":
      return "accepted";
    default:
      return "pending";
  }
}

function ApplicantsPage() {
  return (
    <div className="page">
      <h1 className="page-title">Applicants</h1>
      <div className="card table-card">
        <table className="applicants-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Applied For</th>
              <th>Applied On</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="applicant-cell">
                    <div className="avatar-mini">{initials(a.name)}</div>
                    <strong>{a.name}</strong>
                  </div>
                </td>
                <td>{a.role}</td>
                <td>{a.applied}</td>
                <td>
                  <span className={`status ${statusClass(a.status)}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ApplicantsPage;
