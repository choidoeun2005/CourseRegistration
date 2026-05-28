import Button from "./Button.jsx";

function SearchBar({ keyword, onChange, onSearch }) {
    return (
        <div className="search-bar">
            <input
                value={keyword}
                onChange={(e) => onChange(e.target.value)}
                placeholder="교과목 / 학수번호 / 교수명 검색"
            />
            <Button variant="primary" onClick={onSearch}>
                검색
            </Button>
        </div>
    );
}

export default SearchBar;
